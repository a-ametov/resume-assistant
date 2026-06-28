import { NextResponse } from "next/server";
import type { BuildRequest, CheckRequest, ChangeRequest, SkillsRequest } from "../shared/types";
import GeminiClient from "../server/gemini_client";

export async function handleCheck(request: Request, isSummary: boolean) {
    try {
        const body = (await request.json()) as CheckRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.check(body, isSummary);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to run check.";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}


export async function handleChange(request: Request, isSummary: boolean) {
    try {
        const body = (await request.json()) as ChangeRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.change(body, isSummary);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to run change.";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function handleSkills(request: Request) {
try {
        const body = (await request.json()) as SkillsRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.skills(body);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to run skills check.";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function handleBuild(request: Request) {
    try {
        const body = (await request.json()) as BuildRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.build(body);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to build resume suggestions.";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}