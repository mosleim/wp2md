// get author, without decoding

import { Post } from "../types";

// WordPress doesn't allow funky characters in usernames anyway
export const author = (post: Post):string =>{
	return post.data.creator[0];
}
