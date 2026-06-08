import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Hr,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
  institutionName?: string;
}

export function BaseLayout({ preview, children, institutionName = "Nexora EDU" }: BaseLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f1f5f9", fontFamily: "sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 8, maxWidth: 560, margin: "0 auto", padding: "40px 32px" }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 2, textTransform: "uppercase", color: "#0D9488", marginBottom: 24 }}>
            {institutionName}
          </Text>
          {children}
          <Hr style={{ borderColor: "#e2e8f0", margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
            Você está recebendo este email porque possui uma conta na plataforma {institutionName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
