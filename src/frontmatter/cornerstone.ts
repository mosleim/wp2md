import { Post } from "../types";


// get cornerstone from yoast
export const cornerstone = (post: Post) :string => {
        if (post.data.description){
            return post.data.description[0];
        }
        if (!post.data.postmeta) {
            return ""
        };
        const yoastmetadesc = post.data.postmeta.find(meta => meta.meta_key[0]==='_yoast_wpseo_is_cornerstone');
        return yoastmetadesc?.meta_value[0]??"";
    }
    