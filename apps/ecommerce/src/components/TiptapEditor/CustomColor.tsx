import { Mark, mergeAttributes } from '@tiptap/core'


declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        customColor: {
            setColorClass: (colorClass: string) => ReturnType
            unsetColorClass: () => ReturnType
        }
    }
}

export const CustomColor = Mark.create({
    name: 'customColor',

    addAttributes() {
        return {
            colorClass: {
                default: null,
                parseHTML: element => element.getAttribute('data-color-class'),
                renderHTML: attributes => {
                    return {
                        'data-color-class': attributes.colorClass,
                        class: attributes.colorClass,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-color-class]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0]
    },

    addCommands() {
        return {
            setColorClass:
                (colorClass: string) =>
                    ({ commands }) => {
                        return commands.setMark(this.name, { colorClass })
                    },
            unsetColorClass:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name)
                    },
        }
    },
})
