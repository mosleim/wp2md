import { description } from "./description";
import { Post } from "../types";


// get excerpt, not decoded, newlines collapsed
export const excerpt = (post: Post):string  => {
	const data = post.data.encoded[1].replace(/[\r\n]+/gm, ' ');
	if(data) return  data;
	return description(post)
};
