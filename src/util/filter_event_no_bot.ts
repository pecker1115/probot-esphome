import { Context } from "probot";

export const filterEventNoBot = (
  name: string,
  handler: (context: any) => Promise<void>
): ((context: any) => Promise<void>) => {
  // Wrapped handler function
  return async (context: Context) => {
    if (context.isBot) {
      context.log.debug(`${name}: Skipping event because it's a bot.`);
      return;
    }

    await handler(context);
  };
};
