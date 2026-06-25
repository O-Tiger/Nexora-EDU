# Release Workflow

## Versionamento

Nexora EDU segue [SemVer](https://semver.org/lang/pt-BR/):

| Tipo de mudança | Bump |
|---|---|
| `feat` — nova funcionalidade | MINOR (`0.2.0` → `0.3.0`) |
| `fix` — correção de bug | PATCH (`0.3.0` → `0.3.1`) |
| `feat!` ou `BREAKING CHANGE:` | MAJOR (`0.3.0` → `1.0.0`) |
| `chore`, `refactor`, `docs`, `test` | Sem bump |

## Fluxo completo de release

### 1. Garantir que `dev` está pronto

```bash
git checkout dev
git pull origin dev
npm run typecheck   # zero erros
npm run build       # build limpo
```

### 2. Atualizar CHANGELOG.md

Renomeie `[Unreleased]` para a nova versão:

```markdown
## [v0.3.0] - 2026-07-01

### Added
- feat(itinerario): trilha por aluno em disciplinas eletivas
- feat(diario): filtro de disciplinas por paridade semanal

### Fixed
- fix(seed): upsert sempre atualiza passwordHash dos usuários seed
```

### 3. Bump de versão

```bash
# No root package.json
npm version minor   # ou patch / major
# Isso atualiza o version e cria um commit de versão automático
```

Ou manualmente em `package.json`:

```json
{ "version": "0.3.0" }
```

### 4. Commit de release

```bash
git add CHANGELOG.md package.json
git commit -m "chore(release): bump version to v0.3.0"
```

### 5. Merge dev → main

```bash
git checkout main
git merge dev --no-ff -m "chore: merge dev into main for v0.3.0"
```

Ou via PR no GitHub (recomendado — CI roda antes do merge).

### 6. Tag

```bash
git tag v0.3.0
git push origin main
git push origin v0.3.0
```

### 7. GitHub Release

1. GitHub → Releases → Draft a new release
2. Selecione a tag `v0.3.0`
3. Título: `v0.3.0 — <resumo de uma linha>`
4. Cole o conteúdo da seção do CHANGELOG como release notes
5. Publique

O Railway detecta o push para `main` e faz o deploy automaticamente.

## Hotfix (correção urgente de produção)

```bash
# Criar branch a partir de main
git checkout main
git checkout -b hotfix/nome-do-bug

# Corrigir, commitar, testar
git commit -m "fix(scope): descrição do fix"

# Merge em main
git checkout main
git merge hotfix/nome-do-bug --no-ff

# Bump patch + tag
git tag v0.3.1
git push origin main v0.3.1

# Merge de volta em dev (para não perder o fix)
git checkout dev
git merge main --no-ff
git push origin dev

# Limpar branch
git branch -d hotfix/nome-do-bug
git push origin --delete hotfix/nome-do-bug
```

## Branching strategy

```
main ──────────────────────────────────● v0.3.0
       ↑                              /
dev ───●──●──●──●──●──●──●──●────────
            \         /
feat/xyz ────●──●──●──
```

- `main` — sempre deployável, nunca commite direto (exceto hotfixes)
- `dev` — integração de features; features mergeiam aqui primeiro
- `feat/*`, `fix/*` — branches de trabalho, mergeiam em `dev` via PR
- `hotfix/*` — emergências; brancham de `main`, mergeiam em `main` + `dev`
