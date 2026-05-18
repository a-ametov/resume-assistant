import type { ChangeRequest, CheckRequest, SkillsRequest } from "../shared/types";

const experienceBase = [
	"You are evaluating a resume entry on a job application.",
	"The candidate is applying for a position at {{targetCompany}}",
	"The role they are targeting is {{targetCompanyPositionTitle}}",
	"The responsibilities of the role are listed as: {{targetCompanyPositionResponsibilities}}",
	"This entry is for the candidate's previous experience working at {{previousCompany}} (Previous Company)",
	"The title they held at that company was {{previousCompanyPositionTitle}}",
	"Other Experience Entries for the same company they worked at:",
	"{{previousCompanyExperiencesContext}}",
	"",
	"The input text corresponds to one Experience Entry at the above Previous Company.",
	"Limit changes to rephrasing only, no new responsibilities should be written.",
	"Target the feedback to be for the role the candidate is applying for.",
	"",
].join("\n");

const summaryBase = [
	"You are evaluating a resume entry on a job application.",
	"The candidate is applying for a position at {{targetCompany}}",
	"The role they are targeting is {{targetCompanyPositionTitle}}",
	"The responsibilities of the role are listed as: {{targetCompanyPositionResponsibilities}}",
	"This entry is a portion of the candidate summary at the top of the resume.",
	"Limit changes to rephrasing only, no new responsibilities should be written.",
	"Target the feedback to be for the role the candidate is applying for.",
	"Recommendation should make grammatical sense in the form of either ",
	" * [I am (a)] <recommendation>, or",
	" * [I have (a)] <recommendation>",
	"Do not repeat the candidate's title or qualifications from other experience entries:",
	"{{previousCompanyExperiencesContext}}",
].join("\n");

const checkBase = [
	"Task:",
	"- Grade the provided text from 0 to 10.",
	"- Provide a brief reasoning for the grade.",
	"- Provide one rewritten version of the text that is stronger and clearer.",
	"- Grade the rewritten version from 0 to 10.",
	"",
	"Input Text:",
	"{{text}}",
	"",
	"Return ONLY valid JSON with this exact shape:",
	'{"rating": <number 0-10>, "recommendation": "<rewritten text>", "reasoning": "<brief reasoning>", "recommendationRating": <number 0-10>}',
].join("\n");

const changeBase = [
	"Task:",
	"- Use the provided text and its current rating.",
	"- Generate an improved rewritten version of the text that is stronger and clearer.",
	"- Provide brief reasoning for the improvement.",
	"- Grade the new version from 0 to 10.",
	"",
	"Original Text:",
	"{{originalText}}",
	"",
	"Original Rating:",
	"{{originalRating}}/10",
	"",
	"Previous Rewrite:",
	"{{oldRewrite}}",
	"",
	"Previous Rewrite Rating:",
	"{{oldRewriteRating}}/10",
	"",
	"Return ONLY valid JSON with this exact shape:",
	'{"recommendation": "<rewritten text>", "reasoning": "<brief reasoning>", "recommendationRating": <number 0-10>}',
].join("\n");

function stringifyTemplateValue(value: string | number | string[]): string {
	if (Array.isArray(value)) {
		return value.filter((entry) => entry.trim().length > 0).join("\n");
	}

	return String(value);
}

function fillTemplate(template: string, values: Record<string, string | number | string[]>): string {
	let result = template;

	for (const [key, value] of Object.entries(values)) {
		result = result.replaceAll(`{{${key}}}`, stringifyTemplateValue(value));
	}

	return result;
}

const checkSummaryTemplate = [
	summaryBase,
	"",
	checkBase,
].join("\n");

const changeSummaryTemplate = [
	summaryBase,
	"",
	changeBase,
].join("\n");

const checkExperienceTemplate = [
	experienceBase,
	"",
	checkBase,
].join("\n");

const changeExperienceTemplate = [
	experienceBase,
	"",
	changeBase,
].join("\n");

const skillsTemplate = [
	"You are evaluating candidate skills on a job application.",
	"The candidate is applying for a position at {{targetCompany}}",
	"The role they are targeting is {{targetCompanyPositionTitle}}",
	"The responsibilities of the role are listed as: {{targetCompanyPositionResponsibilities}}",
	"",
	"This is the candidate's previous work experience and responsibilities,",
	"In the format of <Company>:",
	"\t* <Experience Entry>",
	"",
	"{{previousExperience}}",
	"",
	"Skills the candidate has already listed:",
	"{{listedSkills}}",
	"",
	"Task:",
	"- Grade the current list of skills on a scale from 0 to 10.",
	"- Suggest a more comprehensive list of skills that fit the job description and company,",
	"while being relevant to the candidate's experience.",
	"- Include skills that the candidate has already listed if they are relevant.",
	"- Also provide a list of skills that the user provided that are not relevant and should be removed.",
	"- Provide a brief reasoning for the suggestions and removals.",
	"",
	"- Skills should be concise, one or two words.",
	"Return ONLY valid JSON with this exact shape:",
	"{'rating': <number 0-10>, 'suggestedSkills': [<list of suggested skills>], 'irrelevantSkills': [<list of irrelevant skills>], 'reasoning': '<brief reasoning>'}'",
].join("\n");

export function createCheckExperiencePrompt(req: CheckRequest): string {
	return fillTemplate(checkExperienceTemplate, req);
}

export function createChangeExperiencePrompt(req: ChangeRequest): string {
	return fillTemplate(changeExperienceTemplate, {
		...req,
		originalText: req.text,
	});
}

export function createCheckSummaryPrompt(req: CheckRequest): string {
	return fillTemplate(checkSummaryTemplate, {
		...req,
		previousCompany: "Summary",
		previousCompanyPositionTitle: "Summary",
	});
}

export function createChangeSummaryPrompt(req: ChangeRequest): string {
	return fillTemplate(changeSummaryTemplate, {
		...req,
		originalText: req.text,
		previousCompany: "Summary",
		previousCompanyPositionTitle: "Summary",
	});
}

export function createSkillsPrompt(req: SkillsRequest): string {
	return fillTemplate(skillsTemplate, {
		...req,
		listedSkills: req.listedSkills.join("\n"),
		previousExperience: req.previousExperience
			.map((experience) => `${experience.companyName}:\n\t* ${experience.experience.join("\n\t* ")}`)
			.join("\n\n"),
	});
}
