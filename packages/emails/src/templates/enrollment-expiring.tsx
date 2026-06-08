import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "../layouts/base";

interface Props {
  studentName: string;
  courseName: string;
  expiresAt: string;
  daysLeft: number;
  renewUrl: string;
  institutionName?: string;
}

export function EnrollmentExpiringEmail({ studentName, courseName, expiresAt, daysLeft, renewUrl, institutionName }: Props) {
  return (
    <BaseLayout preview={`Sua matrícula em ${courseName} expira em ${daysLeft} dias`} {...(institutionName !== undefined && { institutionName })}>
      <Heading style={{ fontSize: 24, color: "#1A3A5C", marginBottom: 8 }}>
        Sua matrícula está prestes a expirar
      </Heading>
      <Text style={{ color: "#475569", marginBottom: 8 }}>
        Olá, {studentName}!
      </Text>
      <Text style={{ color: "#475569", marginBottom: 24 }}>
        Sua matrícula no curso <strong>{courseName}</strong> expira em <strong>{daysLeft} dia{daysLeft !== 1 ? "s" : ""}</strong> ({expiresAt}). Renove agora para continuar tendo acesso ao conteúdo.
      </Text>
      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Button href={renewUrl} style={{ backgroundColor: "#f59e0b", color: "#ffffff", padding: "12px 28px", borderRadius: 6, fontWeight: "bold", textDecoration: "none" }}>
          Renovar matrícula
        </Button>
      </Section>
    </BaseLayout>
  );
}

export default EnrollmentExpiringEmail;
