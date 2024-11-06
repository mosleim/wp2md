// get description

import { Post } from "../types";


// if description is empty, try find meta desc from yoast
export const description = (post: Post):string => {
    if (post.data.description[0]){
        return post.data.description[0];
    }
    if (!post.data.postmeta) {
        return ""
    };
    const yoastmetadesc = post.data.postmeta.find(meta => meta.meta_key[0]==='_yoast_wpseo_metadesc');
	return yoastmetadesc?.meta_value[0]??'';
}


// _yoast_wpseo_estimated-reading-time-minutes
// _yoast_wpseo_wordproof_timestamp
// _yoast_wpseo_focuskw
// _yoast_wpseo_metadesc
// _yoast_wpseo_linkdex
// _yoast_wpseo_content_score
// _yoast_wpseo_is_cornerstone
// _yoast_wpseo_primary_category
// _yoast_wpseo_title
// _yoast_wpseo_primary_project_category