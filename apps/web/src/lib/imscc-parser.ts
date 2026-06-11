import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";

export interface ImsccLesson {
  title: string;
  type: "VIDEO" | "PDF" | "TEXT" | "LINK";
  content?: string;
  url?: string;
  fileKey?: string;
  originalFileName?: string;
}

export interface ImsccModule {
  title: string;
  lessons: ImsccLesson[];
}

export interface ImsccParseResult {
  courseTitle: string;
  modules: ImsccModule[];
  files: Map<string, Buffer>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Encontra um entry no zip por caminho exato ou sufixo. */
function findEntry(entries: AdmZip.IZipEntry[], href: string): AdmZip.IZipEntry | undefined {
  if (!href) return undefined;
  const norm = href.replace(/\\/g, "/");
  return (
    entries.find((e) => e.entryName === norm) ??
    entries.find((e) => e.entryName.endsWith("/" + norm)) ??
    entries.find((e) => e.entryName.endsWith(norm))
  );
}

/** Retorna o href principal de um resource (atributo direto ou primeiro file). */
function getHref(resource: Record<string, unknown>): string {
  if (typeof resource.href === "string" && resource.href) return resource.href;
  const file = resource.file;
  if (!file) return "";
  const first = Array.isArray(file) ? file[0] : file;
  return (first as Record<string, unknown>)?.href as string ?? "";
}

/**
 * Classifica o tipo de resource IMS Common Cartridge.
 * Canvas exporta tipos como: webcontent, imswl_xmlv1p1, imsbasiclti_xmlv1p0,
 * imsqti_xmlv1p2/..., imsdt_xmlv1p0, associatedcontent/...
 */
function classifyType(rType: string): "webcontent" | "weblink" | "lti" | "quiz" | "discussion" | "unknown" {
  const t = rType.toLowerCase();
  if (t.includes("webcontent") || t.includes("associatedcontent")) return "webcontent";
  if (t.includes("imswl") || t.includes("weblink") || t.includes("web_link")) return "weblink";
  if (t.includes("imsbasiclti") || t.includes("ltilink") || t.includes("lti_link")) return "lti";
  if (t.includes("imsqti") || t.includes("qti") || t.includes("quiz")) return "quiz";
  if (t.includes("imsdt") || t.includes("discussion")) return "discussion";
  return "unknown";
}

/**
 * Para resources do tipo imswl (web link do Canvas), a URL real está dentro de um
 * arquivo XML — o `href` do resource aponta para esse XML, não para a URL direta.
 *
 * Exemplo de conteúdo:
 * <webLink>
 *   <url href="https://example.com" target="_blank"/>
 * </webLink>
 */
async function extractWebLinkUrl(
  entries: AdmZip.IZipEntry[],
  href: string,
): Promise<string | null> {
  const entry = findEntry(entries, href);
  if (!entry) return null;
  try {
    const xml = entry.getData().toString("utf-8");
    const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
    // Canvas: webLink.url.href  |  spec mais antiga: webLink.url
    const webLink = parsed?.weblink ?? parsed?.webLink ?? parsed?.["wl:webLink"];
    const url =
      webLink?.url?.href ??
      webLink?.url?._ ??
      webLink?.url ??
      webLink?.["wl:url"]?.href ??
      null;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Para resources de quiz QTI, extrai o título a partir do XML.
 * Retorna um texto resumido para exibição como item "LINK" apontando para o arquivo.
 */
async function extractQuizTitle(
  entries: AdmZip.IZipEntry[],
  href: string,
): Promise<string | null> {
  const entry = findEntry(entries, href);
  if (!entry) return null;
  try {
    const xml = entry.getData().toString("utf-8");
    const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
    return (
      parsed?.questestinterop?.assessment?.title ??
      parsed?.assessment?.title ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Processa um item da organização e retorna um ImsccLesson.
 * Lida com todos os tipos de resource do Canvas.
 */
async function processItem(
  sub: Record<string, unknown>,
  resourceMap: Map<string, Record<string, unknown>>,
  entries: AdmZip.IZipEntry[],
  files: Map<string, Buffer>,
): Promise<ImsccLesson | null> {
  const lessonTitle = (sub.title as string) ?? "Sem título";
  const refId = sub.identifierref as string | undefined;
  const resource = refId ? resourceMap.get(refId) : undefined;

  // Referência sem resource no pacote — mantém o item visível como placeholder
  // em vez de descartá-lo (alguns LMS exportam apenas o título do item).
  if (!resource) {
    return {
      title: lessonTitle,
      type: "TEXT",
      content: `<p><em>Conteúdo ainda não disponível no pacote importado.</em></p>`,
    };
  }

  const rType: string = (resource.type as string) ?? "";
  const kind = classifyType(rType);
  const href = getHref(resource);

  switch (kind) {
    case "webcontent": {
      const lower = href.toLowerCase();
      // Páginas HTML são renderizadas inline no player
      if (/\.(x?html?)$/.test(lower)) {
        const entry = findEntry(entries, href);
        const raw = entry ? entry.getData().toString("utf-8") : "";
        return { title: lessonTitle, type: "TEXT", content: raw };
      }
      // Qualquer outro arquivo (pdf, docx, png, pptx…) vira arquivo para download.
      // PDF é o "tipo arquivo" genérico do schema atual.
      const entry = findEntry(entries, href);
      if (entry) files.set(href, entry.getData());
      return {
        title: lessonTitle,
        type: "PDF",
        originalFileName: href.split("/").pop() ?? "arquivo",
      };
    }

    case "weblink": {
      const url = await extractWebLinkUrl(entries, href);
      return url != null
        ? { title: lessonTitle, type: "LINK", url }
        : { title: lessonTitle, type: "TEXT", content: "<p><em>Link não disponível.</em></p>" };
    }

    case "lti": {
      // LTI tools: trata como link externo; o href pode ser o endpoint ou um XML descritivo
      const entry = findEntry(entries, href);
      let url: string | undefined;
      if (entry) {
        try {
          const xml = entry.getData().toString("utf-8");
          const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
          url =
            parsed?.cartridge_basiclti_link?.blti?.launch_url ??
            parsed?.cartridge_basiclti_link?.["blti:launch_url"] ??
            href;
        } catch {
          url = href;
        }
      }
      return url != null
        ? { title: lessonTitle, type: "LINK", url }
        : { title: lessonTitle, type: "TEXT", content: "<p><em>Ferramenta externa não disponível.</em></p>" };
    }

    case "quiz": {
      // QTI questionário — importado como LINK para o arquivo dentro do curso
      // (Fase 2 terá suporte completo a avaliações)
      const quizTitle = await extractQuizTitle(entries, href);
      return {
        title: quizTitle ?? lessonTitle,
        type: "TEXT",
        content: `<p><strong>Questionário:</strong> ${quizTitle ?? lessonTitle}</p><p><em>O conteúdo completo das questões estará disponível após implementação do módulo de avaliações (Fase 2).</em></p>`,
      };
    }

    case "discussion": {
      const entry = findEntry(entries, href);
      let content = "";
      if (entry) {
        try {
          const xml = entry.getData().toString("utf-8");
          const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
          const topic =
            parsed?.topic ??
            parsed?.["dt:topic"] ??
            parsed?.topicMeta;
          const body =
            topic?.text?._ ??
            topic?.text ??
            topic?.body?._ ??
            topic?.body ??
            "";
          const title_ = topic?.title ?? "";
          content = `<h2>${title_}</h2>${body}`;
        } catch {
          content = entry.getData().toString("utf-8");
        }
      }
      return { title: lessonTitle, type: "TEXT", content };
    }

    default: {
      // Tipo desconhecido — tentar ler como texto/HTML
      const entry = findEntry(entries, href);
      if (!entry) return { title: lessonTitle, type: "TEXT", content: "" };
      const raw = entry.getData().toString("utf-8");
      return { title: lessonTitle, type: "TEXT", content: raw };
    }
  }
}

/**
 * Percorre a árvore de organização em qualquer profundidade.
 * - item com `identifierref` → é uma lição (folha) → agrupada no módulo atual
 * - item sem ref mas com filhos → é um container/módulo → recursão
 * Lições folha consecutivas são agrupadas sob o título do container que as contém.
 */
async function walkItems(
  items: Record<string, unknown>[],
  resourceMap: Map<string, Record<string, unknown>>,
  entries: AdmZip.IZipEntry[],
  files: Map<string, Buffer>,
  inheritedTitle: string,
  modules: ImsccModule[],
): Promise<void> {
  let pending: ImsccLesson[] = [];
  const flush = () => {
    if (pending.length > 0) {
      modules.push({ title: inheritedTitle || "Conteúdo", lessons: pending });
      pending = [];
    }
  };

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    if (item.identifierref) {
      const lesson = await processItem(item, resourceMap, entries, files);
      if (lesson) pending.push(lesson);
    } else if (item.item) {
      // Container: fecha o grupo de folhas atual e desce um nível
      flush();
      const title = (item.title as string) || inheritedTitle || "";
      await walkItems(toArray(item.item) as Record<string, unknown>[], resourceMap, entries, files, title, modules);
    }
  }
  flush();
}

// ─── Categorização de materiais ────────────────────────────────────────────────

/** Extrai o número de módulo de um título (ex: "Textos - Módulo 3: ..." → 3). */
function moduleNumberOf(title: string): number | null {
  const m = title.match(/m[óo]dulo\s*0*(\d+)/i);
  return m && m[1] ? parseInt(m[1], 10) : null;
}

/**
 * Detecta um "container de materiais": módulo cujo título indica anexos/arquivos,
 * ou que é composto exclusivamente por arquivos (PDF) — padrão comum de exports
 * que separam os textos/PDFs numa pasta única em vez de aninhá-los por módulo.
 */
function isMaterialsModule(m: ImsccModule): boolean {
  if (/materiai?s|material|anexos|arquivos|documentos|biblioteca|downloads?/i.test(m.title)) return true;
  return m.lessons.length > 1 && m.lessons.every((l) => l.type === "PDF");
}

/**
 * Redistribui as lições de containers de materiais para os módulos de conteúdo
 * correspondentes, casando pelo número de módulo presente no título do material.
 * Materiais sem correspondência permanecem num módulo residual.
 */
function categorizeMaterials(modules: ImsccModule[]): ImsccModule[] {
  const contentModules = modules.filter((m) => !isMaterialsModule(m));
  if (contentModules.length === 0) return modules; // nada para casar — mantém como está

  // Mapa número-do-módulo → módulo de conteúdo (título com número, ou posição)
  const byNumber = new Map<number, ImsccModule>();
  contentModules.forEach((m, idx) => {
    const n = moduleNumberOf(m.title) ?? idx + 1;
    if (!byNumber.has(n)) byNumber.set(n, m);
  });

  const result: ImsccModule[] = [];
  let movedAny = false;

  for (const mod of modules) {
    if (!isMaterialsModule(mod)) {
      result.push(mod);
      continue;
    }
    const leftover: ImsccLesson[] = [];
    for (const lesson of mod.lessons) {
      const n = moduleNumberOf(lesson.title);
      const target = n != null ? byNumber.get(n) : undefined;
      if (target && target !== mod) {
        target.lessons.push(lesson);
        movedAny = true;
      } else {
        leftover.push(lesson);
      }
    }
    if (leftover.length > 0) result.push({ ...mod, lessons: leftover });
  }

  // Se nada casou, preserva a estrutura original (evita reordenar à toa)
  return movedAny ? result : modules;
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export async function parseImscc(buffer: Buffer): Promise<ImsccParseResult> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const manifestEntry = entries.find(
    (e) => e.entryName === "imsmanifest.xml" || e.entryName.endsWith("/imsmanifest.xml"),
  );
  if (!manifestEntry) throw new Error("Arquivo .imscc inválido: imsmanifest.xml não encontrado");

  const manifestXml = manifestEntry.getData().toString("utf-8");
  const manifest = await parseStringPromise(manifestXml, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
    normalize: true,
  });

  const root = manifest.manifest ?? manifest;

  // Título do curso — lida com prefixo de namespace (lomimscc:) e variações
  const meta = root.metadata ?? {};
  const lom = meta["lomimscc:lom"] ?? meta.lom ?? {};
  const general = lom["lomimscc:general"] ?? lom.general ?? {};
  const titleNode = general["lomimscc:title"] ?? general.title ?? {};
  const courseTitle: string =
    titleNode["lomimscc:string"]?._ ??
    titleNode["lomimscc:string"] ??
    titleNode.string?._ ??
    titleNode.string ??
    toArray(root.organizations?.organization)[0]?.title ??
    "Curso importado";

  const modules: ImsccModule[] = [];
  const files = new Map<string, Buffer>();

  // Indexar resources por identifier
  const resourceList = toArray(root.resources?.resource);
  const resourceMap = new Map<string, Record<string, unknown>>();
  for (const r of resourceList) {
    if (r.identifier) resourceMap.set(r.identifier as string, r as Record<string, unknown>);
  }

  // Navegar na estrutura de organização recursivamente (qualquer profundidade)
  const org = toArray(root.organizations?.organization)[0] as Record<string, unknown> | undefined;
  if (!org) return { courseTitle, modules, files };

  await walkItems(
    toArray(org.item) as Record<string, unknown>[],
    resourceMap,
    entries,
    files,
    "",
    modules,
  );

  // Fallback: sem módulos → criar um único com tudo que tiver
  if (modules.length === 0) {
    const lessons: ImsccLesson[] = [];
    for (const [, resource] of resourceMap) {
      const href = getHref(resource as Record<string, unknown>);
      const kind = classifyType((resource.type as string) ?? "");
      if (kind === "webcontent" && href.toLowerCase().endsWith(".pdf")) {
        const entry = findEntry(entries, href);
        if (entry) {
          files.set(href, entry.getData());
          lessons.push({ title: href.split("/").pop() ?? "Arquivo", type: "PDF", originalFileName: href.split("/").pop() ?? "arquivo" });
        }
      }
    }
    if (lessons.length > 0) modules.push({ title: "Conteúdo", lessons });
  }

  // Redistribui PDFs/textos do container plano de materiais para os módulos certos
  return { courseTitle, modules: categorizeMaterials(modules), files };
}
