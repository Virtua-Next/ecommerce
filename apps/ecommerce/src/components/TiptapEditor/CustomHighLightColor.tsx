import { Mark, mergeAttributes } from '@tiptap/core'


declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        customHighlight: {
            setHighlightClass: (highlightClass: string) => ReturnType
            unsetHighlightClass: () => ReturnType
        }
    }
}

export const CustomHighlight = Mark.create({
    name: 'customHighlight',

    addAttributes() {
        return {
            highlightClass: {
                default: null,
                parseHTML: element => element.getAttribute('data-highlight-class'),
                renderHTML: attributes => {
                    return {
                        'data-highlight-class': attributes.highlightClass,
                        class: attributes.highlightClass,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-highlight-class]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0]
    },

    addCommands() {
        return {
            setHighlightClass:
                (highlightClass: string) =>
                    ({ commands }) =>
                        commands.setMark(this.name, { highlightClass }),

            unsetHighlightClass:
                () =>
                    ({ commands }) =>
                        commands.unsetMark(this.name),
        }
    },
})
