import { TextStyle } from '@tiptap/extension-text-style'


export const CustomTextStyle = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {}
                    return { style: `font-size: ${attributes.fontSize}` }
                },
            },
        }
    },

    addCommands() {
        return {
            ...this.parent?.(),
            setFontSize: (fontSize: string) => ({ chain }) => {
                return chain().setMark('textStyle', { fontSize }).run()
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .run()
            },
        }
    },
})
