import { handleCheck } from "../../common";

export async function POST(request: Request) {
    return handleCheck(request, true);
}
