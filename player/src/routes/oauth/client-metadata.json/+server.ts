import { json } from '@sveltejs/kit';
import { clientMetadata } from '#lib/config.ts';

export const prerender = true;
export const GET = () => json(clientMetadata(false));
