import { handleSkills } from "../common";

export async function POST(request: Request) {
    return handleSkills(request);
}
