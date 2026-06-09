export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("@sentry/nextjs");
    const dsn = process.env.SENTRY_DSN;
    init({
      ...(dsn !== undefined && { dsn }),
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
      beforeSend(event) {
        // Nunca enviar senhas, CPFs ou tokens para o Sentry
        if (event.request?.data) {
          const data = event.request.data as Record<string, unknown>;
          delete data.password;
          delete data.passwordHash;
          delete data.cpf;
          delete data.token;
        }
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { init } = await import("@sentry/nextjs");
    const dsn = process.env.SENTRY_DSN;
    init({
      ...(dsn !== undefined && { dsn }),
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
  }
}

export const onRequestError = async (
  err: unknown,
  request: Parameters<typeof import("@sentry/nextjs")["captureRequestError"]>[1],
  context: Parameters<typeof import("@sentry/nextjs")["captureRequestError"]>[2],
) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(err, request, context);
};
