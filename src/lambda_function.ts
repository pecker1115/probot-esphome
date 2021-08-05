import { createNodeMiddleware, Probot } from "probot";

// based on https://github.com/probot/adapter-aws-lambda-serverless
// but modified for probot v12
export async function lambdaFunction(probot: Probot, event, context) {
  try {
    // Ends function immediately after callback
    context.callbackWaitsForEmptyEventLoop = false;

    // lowercase all headers to respect headers insensitivity
    let headersLowerCase = {};
    for (const [key, value] of Object.entries(event.headers)) {
      headersLowerCase[key.toLowerCase()] = value;
    }

    await probot.webhooks.verifyAndReceive({
      id: headersLowerCase["x-github-delivery"],
      name: headersLowerCase["x-github-event"],
      signature:
        headersLowerCase["x-hub-signature-256"] ||
        headersLowerCase["x-hub-signature"],
      payload: JSON.parse(event.body),
    });

    return {
      statusCode: 200,
      body: '{"ok":true}',
    };
  } catch (error) {
    return {
      statusCode: error.status || 500,
      error: "ooops",
    };
  }
}

export function createLambdaFunction(
  app: (probot: Probot) => void,
  probot: Probot
) {
  app(probot);
  return (event, context) => {
    return lambdaFunction(probot, event, context);
  };
}
