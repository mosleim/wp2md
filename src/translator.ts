import  turndown from 'turndown';
import { config, Item, Post } from './types';
import { getPostPath } from './utils';

export function initTurndownService() {
	const turndownService = new turndown({
		headingStyle: 'atx',
		bulletListMarker: '-',
		codeBlockStyle: 'fenced'
	});

	// turndownService.use(turndownPluginGfm.tables);

	// preserve embedded tweets
	turndownService.addRule('tweet', {
		filter: node => node.nodeName === 'BLOCKQUOTE' && node.getAttribute('class') === 'twitter-tweet',
		replacement: (content, node) => {
			if(!(node instanceof HTMLElement))  return '';

			return '\n\n' + node.outerHTML
			
		}
	});

	// preserve embedded codepens
	turndownService.addRule('codepen', {
		filter: node => {
			// codepen embed snippets have changed over the years
			// but this series of checks should find the commonalities
			return (
				['P', 'DIV'].includes(node.nodeName) &&
				node.getAttribute('data-slug-hash')?true:false &&
				node.getAttribute('class') === 'codepen'
			);
		},
		replacement: (content, node) => {
			if(!(node instanceof HTMLElement))  return '';
			return '\n\n' + node.outerHTML;
		}
	});

	// preserve embedded scripts (for tweets, codepens, gists, etc.)
	turndownService.addRule('script', {
		filter: 'script',
		replacement: (content, node) => {
			if(!(node instanceof HTMLElement))  return '';
			let before = '\n\n';
			if (node.previousSibling && node.previousSibling.nodeName !== '#text') {
				// keep twitter and codepen <script> tags snug with the element above them
				before = '\n';
			}
			const html = node.outerHTML.replace('async=""', 'async');
			return before + html + '\n\n';
		}
	});

	// iframe boolean attributes do not need to be set to empty string
	turndownService.addRule('iframe', {
		filter: 'iframe',
		replacement: (content, node) => {
			if(!(node instanceof HTMLElement))  return '';

			const html = node.outerHTML
				.replace('allowfullscreen=""', 'allowfullscreen')
				.replace('allowpaymentrequest=""', 'allowpaymentrequest');
			return '\n\n' + html + '\n\n';
		}
	});

	// preserve <figure> when it contains a <figcaption>
	turndownService.addRule('figure', {
		filter: 'figure',
		replacement: (content, node) => {
			if (node.querySelector('figcaption')) {
				// extra newlines are necessary for markdown and HTML to render correctly together
				const result = '\n\n<figure>\n\n' + content + '\n\n</figure>\n\n';
				return result.replace('\n\n\n\n', '\n\n'); // collapse quadruple newlines
			} else {
				// does not contain <figcaption>, do not preserve
				return content;
			}
		}
	});

	// preserve <figcaption>
	turndownService.addRule('figcaption', {
		filter: 'figcaption',
		replacement: (content, node) => {
			// extra newlines are necessary for markdown and HTML to render correctly together
			return '\n\n<figcaption>\n\n' + content + '\n\n</figcaption>\n\n';
		}
	});

	// convert <pre> into a code block with language when appropriate
	turndownService.addRule('pre', {
		filter: node => {
			// a <pre> with <code> inside will already render nicely, so don't interfere
			return node.nodeName === 'PRE' && !node.querySelector('code');
		},
		replacement: (content, node) => {
			if(!(node instanceof HTMLElement))  return '';
			const language = node.getAttribute('data-wetm-language') || '';
			return '\n\n```' + language + '\n' + node.textContent + '\n```\n\n';
		}
	});

	return turndownService;
}

export function getPostContent(post: Post, turndownService: turndown) :string{
	let content = post.data.encoded[0];

	// insert an empty div element between double line breaks
	// this nifty trick causes turndown to keep adjacent paragraphs separated
	// without mucking up content inside of other elements (like <code> blocks)
	content = content.replace(/(\r?\n){2}/g, '\n<div></div>\n');

	if (config.saveScrapedImages) {
		// writeImageFile() will save all content images to a relative /images
		// folder so update references in post content to match
		const imgPath =  getPostPath(post, true, true);
		
		content = content.replace(/(<img[^>]*src=").*?([^/"]+\.(?:gif|jpe?g|png|webp))("[^>]*>)/gi, '$1'+imgPath+'/$2$3');
	}

	// preserve "more" separator, max one per post, optionally with custom label
	// by escaping angle brackets (will be unescaped during turndown conversion)
	content = content.replace(/<(!--more( .*)?--)>/, '&lt;$1&gt;');

	// some WordPress plugins specify a code language in an HTML comment above a
	// <pre> block, save it to a data attribute so the "pre" rule can use it
	content = content.replace(/(<!-- wp:.+? \{"language":"(.+?)"\} -->\r?\n<pre )/g, '$1data-wetm-language="$2" ');

	content = removeDiviTags(content)
	// use turndown to convert HTML to Markdown
	content = turndownService.turndown(content);

	// clean up extra spaces in list items
	content = content.replace(/(-|\d+\.) +/g, '$1 ');

	return content;
}


// Fungsi untuk menghapus semua tag template Divi
function removeDiviTags(content: string): string {
    // Regex untuk mencocokkan tag Divi seperti [et_pb_section], [et_pb_row], [et_pb_column], [et_pb_text]
	const diviTagRegex =  /\[\/?et_pb_(section|row|column|text|image)[^\]]*]/g;

    // Ganti semua tag yang cocok dengan string kosong
    return content.replace(diviTagRegex, "");
}

// Contoh penggunaan
const originalContent = `
    [et_pb_section fb_built="1" _builder_version="4.19.2" hover_enabled="0" global_colors_info="{}" module_class="molti-article" sticky_enabled="0"]
        [et_pb_row _builder_version="4.16" background_size="initial" background_position="top_left" background_repeat="repeat" global_colors_info="{}"]
            [et_pb_column type="4_4" _builder_version="4.16" custom_padding="|||" global_colors_info="{}" custom_padding__hover="|||"]
                [et_pb_text _builder_version="4.16" background_size="initial" background_position="top_left" background_repeat="repeat" global_colors_info="{}"]Hello World![/et_pb_text]
            [/et_pb_column]
        [/et_pb_row]
    [/et_pb_section]
`;

const cleanedContent = removeDiviTags(originalContent);
console.log(cleanedContent);