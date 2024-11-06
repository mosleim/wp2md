import { Post } from "../types";


// get keyword from yoast
export const keyword =  (post: Post):string[] => {
        if (!post.data.postmeta) {
            return []
        };
        const yoastmetadesc = post.data.postmeta.find(meta => meta.meta_key[0]==='_yoast_wpseo_focuskw');
        return yoastmetadesc?.meta_value??[];
    }