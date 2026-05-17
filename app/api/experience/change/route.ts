import { handleChange } from "../../common";

export async function POST(request: Request) {
    return handleChange(request, false);
}
