import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "../layouts/base";

interface Props {
  studentName: string;
  courseName: string;
  expiresAt?: string;
  courseUrl: string;
  institutionName?: string;
}

export function EnrollmentCreatedEmail({ studentName, courseName, expiresAt, courseUrl, institutionName }: Props) {
  return (
    <BaseLayout preview={`Você foi matriculado em ${courseName}`} {...(institutionName !== undefined && { institutionName })}>
      <Heading style={{ fontSize: 24, color: "#1A3A5C", marginBottom: 8 }}>
        Sua matrícula foi confirmada
      </Heading>
      <Text style={{ color: "#475569", marginBottom: 24 }}>
        Olá, {studentName}! Você foi matriculado no curso <strong>{courseName}</strong>.
        {expiresAt && ` Sua matrícula é válida até ${expiresAt}.`}
      </Text>
      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Button href={courseUrl} style={{ backgroundColor: "#0D9488", color: "#ffffff", padding: "12px 28px", borderRadius: 6, fontWeight: "bold", textDecoration: "none" }}>
          Acessar o curso
        </Button>
      </Section>
      <Text style={{ fontSize: 13, color: "#94a3b8" }}>
        Se tiver dúvidas, entre em contato com a secretaria.
      </Text>
    </BaseLayout>
  );
}

export default EnrollmentCreatedEmail;
