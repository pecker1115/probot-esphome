import { createProbot } from "probot";
import { createLambdaFunction } from "./lambda_function";
import { initApp } from "./app";

// entrypoint for serverless install
export const webhooks = createLambdaFunction(initApp, createProbot());
