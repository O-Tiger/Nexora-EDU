import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "../layouts/base";

interface Props {
  studentName: string;
  courseName: string;
  certificateCode: string;
  validationUrl: string;
  downloadUrl: string;
  institutionName?: string;
}

export function CertificateIssuedEmail({ studentName, courseName, certificateCode, validationUrl, downloadUrl, institutionName }: Props) {
  return (
    <BaseLayout preview={`Parabéns! Seu certificado de ${courseName} está pronto`} institutionName={institutionName}>
      <Heading style={{ fontSize: 24, color: "#1A3A5C", marginBottom: 8 }}>
        Parabéns, você concluiu o curso!
      </Heading>
      <Text style={{ color: "#475569", marginBottom: 24 }}>
        Olá, {studentName}! Você concluiu <strong>{courseName}</strong> com sucesso. Seu certificado já está disponível.
      </Text>
      <Section style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
        <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "bold", letterSpacing: 1, margin: "0 0 4px" }}>CÓDIGO DE VALIDAÇÃO</Text>
        <Text style={{ fontSize: 20, fontFamily: "monospace", color: "#1A3A5C", fontWeight: "bold", margin: 0 }}>{certificateCode}</Text>
      </Section>
      <Section style={{ textAlign: "center", marginBottom: 12 }}>
        <Button href={downloadUrl} style={{ backgroundColor: "#0D9488", color: "#ffffff", padding: "12px 28px", borderRadius: 6, fontWeight: "bold", textDecoration: "none" }}>
          Baixar certificado (PDF)
        </Button>
      </Section>
      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Button href={validationUrl} style={{ backgroundColor: "transparent", color: "#0D9488", padding: "8px 20px", borderRadius: 6, border: "1px solid #0D9488", textDecoration: "none" }}>
          Verificar autenticidade
        </Button>
      </Section>
    </BaseLayout>
  );
}

export default CertificateIssuedEmail;
