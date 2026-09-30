import { Mark, mergeAttributes } from '@tiptap/core'


export interface FontSizeOptions {
    types: string[]
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType
            unsetFontSize: () => ReturnType
        }
    }
}

export const FontSize = Mark.create<FontSizeOptions>({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        }
    },

    addAttributes() {
        return {
            fontSize: {
                default: null,
                parseHTML: element => {
                    // Extrai o valor do font-size de três formas diferentes
                    return element.style.fontSize ||
                        element.getAttribute('data-font-size') ||
                        element.style.getPropertyValue('font-size')
                },
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {}

                    return {
                        'style': `font-size: ${attributes.fontSize}`,
                        'data-font-size': attributes.fontSize
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                style: 'font-size',
                getAttrs: value => ({
                    fontSize: typeof value === 'string' ? value.replace(/['"]+/g, '') : null
                }),
            },
            {
                tag: 'span',
                getAttrs: element => {
                    const fontSize = (element as HTMLElement).style.fontSize ||
                        (element as HTMLElement).getAttribute('data-font-size')
                    return fontSize ? { fontSize } : null
                },
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0]
    },

    addCommands() {
        return {
            setFontSize: fontSize => ({ commands }) => {
                return commands.setMark(this.name, { fontSize })
            },
            unsetFontSize: () => ({ commands }) => {
                return commands.unsetMark(this.name)
            },
        }
    },
})
