import { handleBuild } from "../common";

export async function POST(request: Request) {
    return handleBuild(request);
}
