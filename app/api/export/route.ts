import type { ExportRequest } from "../../shared/types";
import { createTextErrorResponse } from "../common";
import { exportResumeToPdfBytes } from "../../server/pdf_exporter";

function sanitizeFileBaseName(value: string): string {
	const safe = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return safe.length > 0 ? safe : "resume";
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as ExportRequest;

		const bytes = await exportResumeToPdfBytes(body);
		const pdfBytes = Uint8Array.from(bytes);
		const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
		const fileBaseName = sanitizeFileBaseName(body.profile.name);
		const fileName = `${fileBaseName}.pdf`;

		return new Response(pdfBlob, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		return createTextErrorResponse(error, "Unable to export PDF.");
	}
}
