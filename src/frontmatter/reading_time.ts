// get description

import { Post } from "../types";


// if description is empty, try find meta desc from yoast
export const reading_time =  (post: Post):string  => {
        if (!post.data.postmeta) {
            return ""
        };
        const yoastmetadesc = post.data.postmeta.find(meta => meta.meta_key[0]==='_yoast_wpseo_estimated-reading-time-minutes');
        return yoastmetadesc?.meta_value[0]??"";
    }
    