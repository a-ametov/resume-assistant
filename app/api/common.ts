import { NextResponse } from "next/server";
import type { BuildRequest, CheckRequest, ChangeRequest, SkillsRequest } from "../shared/types";
import GeminiClient from "../server/gemini_client";

type EndpointErrorDetails = {
    status: number;
    message: string;
};

function parseErrorObject(value: unknown, fallbackStatus: number): EndpointErrorDetails | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const statusFromCode =
        typeof record.code === "number"
            ? record.code
            : typeof record.code === "string" && /^\d{3}$/.test(record.code)
                ? Number(record.code)
                : fallbackStatus;

    if (typeof record.error === "string") {
        const fromErrorString = parseErrorMessage(record.error, statusFromCode);
        if (fromErrorString) {
            return fromErrorString;
        }
    }

    if (record.error && typeof record.error === "object") {
        const fromNestedError = parseErrorObject(record.error, statusFromCode);
        if (fromNestedError) {
            return fromNestedError;
        }
    }

    if (typeof record.message === "string" && record.message.trim().length > 0) {
        return {
            status: statusFromCode,
            message: record.message.trim(),
        };
    }

    return null;
}

function parseErrorMessage(rawMessage: string, fallbackStatus = 500): EndpointErrorDetails | null {
    const message = rawMessage.trim();
    if (!message) {
        return null;
    }

    const prefixedMatch = message.match(/^(\d{3})\s+([\s\S]+)$/);
    const prefixedStatus = prefixedMatch ? Number(prefixedMatch[1]) : fallbackStatus;
    const payload = (prefixedMatch?.[2] ?? message).trim();

    try {
        const parsed = JSON.parse(payload) as unknown;
        const fromObject = parseErrorObject(parsed, prefixedStatus);
        if (fromObject) {
            return fromObject;
        }
    } catch {
        // Not directly JSON, continue.
    }

    // Handles messages like: "Gemini request failed: 400 {...json...}"
    const nestedJsonMatch = payload.match(/(\d{3})\s+(\{[\s\S]*\})$/);
    if (nestedJsonMatch) {
        const nestedStatus = Number(nestedJsonMatch[1]);
        const nestedPayload = nestedJsonMatch[2];

        try {
            const nestedParsed = JSON.parse(nestedPayload) as unknown;
            const fromNested = parseErrorObject(nestedParsed, nestedStatus);
            if (fromNested) {
                return fromNested;
            }
        } catch {
            // Keep fallback behavior.
        }
    }

    const statusOnlyMatch = payload.match(/(\d{3})/);
    if (statusOnlyMatch) {
        const status = Number(statusOnlyMatch[1]);
        const simplified = payload.replace(/^.*?\b\d{3}\b\s*[:\-]?\s*/, "").trim();
        return {
            status,
            message: simplified || payload,
        };
    }

    return {
        status: prefixedStatus,
        message: payload,
    };
}

export function getEndpointErrorDetails(error: unknown, fallbackMessage: string): EndpointErrorDetails {
    if (error instanceof Error) {
        const parsed = parseErrorMessage(error.message, 500);
        if (parsed?.message) {
            return parsed;
        }
    }

    return {
        status: 500,
        message: fallbackMessage,
    };
}

export function createJsonErrorResponse(error: unknown, fallbackMessage: string) {
    const details = getEndpointErrorDetails(error, fallbackMessage);
    return NextResponse.json({ error: `${details.status}: ${details.message}` }, { status: details.status });
}

export function createTextErrorResponse(error: unknown, fallbackMessage: string) {
    const details = getEndpointErrorDetails(error, fallbackMessage);
    return new Response(`${details.status}: ${details.message}`, {
        status: details.status,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}

export async function handleCheck(request: Request, isSummary: boolean) {
    try {
        const body = (await request.json()) as CheckRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.check(body, isSummary);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return createJsonErrorResponse(error, "Unable to run check.");
    }
}


export async function handleChange(request: Request, isSummary: boolean) {
    try {
        const body = (await request.json()) as ChangeRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.change(body, isSummary);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return createJsonErrorResponse(error, "Unable to run change.");
    }
}

export async function handleSkills(request: Request) {
    try {
        const body = (await request.json()) as SkillsRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.skills(body);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return createJsonErrorResponse(error, "Unable to run skills check.");
    }
}

export async function handleBuild(request: Request) {
    try {
        const body = (await request.json()) as BuildRequest;

        const geminiClient = GeminiClient.getInstance();
        const result = await geminiClient.build(body);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return createJsonErrorResponse(error, "Unable to build resume suggestions.");
    }
}