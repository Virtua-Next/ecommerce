'use client'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Link as TiptapLink } from '@tiptap/extension-link'
import { Image as TiptapImage } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { CustomColor } from './CustomColor'
import { CustomHighlight } from './CustomHighLightColor'
import { CustomTextStyle } from './CustomTextStyle'
import { Placeholder } from '@tiptap/extension-placeholder'
import { useEffect } from 'react'


interface TiptapEditorProps {
    content: string
    onChange: (content: string) => void
    onImagesChange?: (images: string[]) => void
    className?: string
}

export const TiptapEditor = ({ content, onChange, onImagesChange, className = '' }: TiptapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    HTMLAttributes: {
                        class: 'list-disc pl-5',
                    },
                },
                orderedList: {
                    HTMLAttributes: {
                        class: 'list-decimal pl-5',
                    },
                },
            }),
            Underline,
            TiptapLink.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500',
                    styleText: 'text-decoration: none'
                },
            }),
            TiptapImage.configure({
                HTMLAttributes: {
                    class: 'rounded-lg mx-auto max-w-full h-auto',
                },
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            CustomTextStyle,
            CustomColor.configure({
                types: ['textStyle'],
            }),
            CustomHighlight,
            Placeholder.configure({
                placeholder: 'Digite a descrição do produto aqui...',
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html)

            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')
            const images = Array.from(doc.querySelectorAll('img'))
                .map(img => img.src)
                .filter(src => src.startsWith('http') || src.startsWith('data:'))

            if (onImagesChange) onImagesChange(images)
        },
        editorProps: {
            attributes: {
                class: 'min-h-[250px] p-3 focus:outline-none',
            },
        },
        immediatelyRender: false,
    })

    useEffect(() => {
        if (editor && content && content !== editor.getHTML()) {
            editor.commands.setContent(content, {
                emitUpdate: false,
                parseOptions: {
                    preserveWhitespace: 'full',
                },
            })
        }
    }, [content, editor])

    const addImages = () => {
        const input = window.prompt('Cole as URLs das imagens (separadas por vírgula)') || ''
        const urls = input.split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0)

        if (urls.length > 0) {
            urls.forEach(url => {
                editor?.chain().focus().setImage({ src: url }).run()
            })
        }
    }

    if (!editor) {
        return (
            <div className={`border rounded-lg bg-gray-50 min-h-[250px] p-3 ${className}`}>
                Carregando editor...
            </div>
        )
    }

    return (
        <div className={`border rounded-lg overflow-hidden ${className}`}>
            <MenuBar editor={editor} onAddImage={addImages} />
            <EditorContent editor={editor} className="bg-white" />
        </div>
    )
}

const MenuBar = ({ editor, onAddImage }: {
    editor: any
    onAddImage: () => void
}) => {
    if (!editor) return null

    const colors = [
        {
            name: 'Contraste',
            value: 'text-black dark:text-white',
            sample: '#000000,#ffffff',
        },
        {
            name: 'Cinza',
            value: 'text-gray-700 dark:text-gray-300',
            sample: '#374151,#d1d5db',
        },
        {
            name: 'Vermelho',
            value: 'text-red-600 dark:text-red-300',
            sample: '#dc2626,#fca5a5',
        },
        {
            name: 'Azul',
            value: 'text-blue-600 dark:text-blue-300',
            sample: '#2563eb,#93c5fd',
        },
        {
            name: 'Verde',
            value: 'text-green-600 dark:text-green-300',
            sample: '#16a34a,#86efac',
        },
        {
            name: 'Amarelo',
            value: 'text-yellow-500 dark:text-yellow-300',
            sample: '#eab308,#fde68a',
        },
        {
            name: 'Roxo',
            value: 'text-purple-600 dark:text-purple-300',
            sample: '#9333ea,#d8b4fe',
        },
        {
            name: 'Laranja',
            value: 'text-orange-500 dark:text-orange-300',
            sample: '#f97316,#fdba74',
        },
    ]

    const HighlightColors = [
        {
            name: 'Cinza',
            value: 'bg-gray-300 dark:bg-gray-500',
            sample: '#d1d5db,#374151',
        },
        {
            name: 'Vermelho',
            value: 'bg-red-300 dark:bg-red-500',
            sample: '#fca5a5,#7f1d1d',
        },
        {
            name: 'Azul',
            value: 'bg-blue-300 dark:bg-blue-500',
            sample: '#93c5fd,#1e3a8a',
        },
        {
            name: 'Verde',
            value: 'bg-green-300 dark:bg-green-500',
            sample: '#86efac,#065f46',
        },
        {
            name: 'Amarelo',
            value: 'bg-yellow-200 dark:bg-yellow-500',
            sample: '#fef08a,#eab308',
        },
        {
            name: 'Roxo',
            value: 'bg-purple-300 dark:bg-purple-500',
            sample: '#d8b4fe,#5b21b6',
        },
        {
            name: 'Laranja',
            value: 'bg-orange-300 dark:bg-orange-500',
            sample: '#fdba74,#9a3412',
        },
    ]

    const setLink = () => {
        const url = window.prompt('Digite a URL do link')
        if (!url) return

        const openInNewTab = window.confirm('Deseja abrir o link em uma nova aba?')

        editor
            .chain()
            .focus()
            .setLink({
                href: url,
                target: openInNewTab ? '_blank' : undefined,
            })
            .run()
    }


    const setColor = (colorClass: string) => {
        editor.chain().focus().setColorClass(colorClass).run()
    }

    const removeColor = () => {
        editor.chain().focus().unsetColorClass().run()
    }

    const setHighlight = (colorClass: string) => {
        editor.chain().focus().setHighlightClass(colorClass).run()
    }

    const removeHighlight = () => {
        editor.chain().focus().unsetHighlightClass().run()
    }

    const setFontSize = (size: string) => {
        editor.chain().focus().setFontSize(size).run()
    }

    const resetFontSize = () => {
        editor.chain().focus().unsetFontSize().run()
    }

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b dark:border-gray-700">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Negrito">
                <strong>B</strong>
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Itálico">
                <em>I</em>
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded ${editor.isActive('underline') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Sublinhado" >
                <u>U</u>
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Título 1" >
                H1
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Título 2" >
                H2
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Título 3">
                H3
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Lista com marcadores" >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                </svg>
            </button>

            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Lista numerada" >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 4h2v2H3V4zm4 0h14v2H7V4zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 18h2v2H3v-2zm4 0h14v2H7v-2z" />
                </svg>
            </button>

            <button type="button" onClick={setLink} className={`p-2 rounded ${editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Link" >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M10.59 13.41c.41.39.41 1.03 0 1.42c-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0a5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24a2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0a5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24a2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24a.973.973 0 0 1 0-1.42z" />
                </svg>
            </button>

            <button type="button" onClick={onAddImage} className={`p-2 rounded ${editor.isActive('image') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Imagem" >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14Zm1-2h12l-3.75-5l-3 4L9 13l-3 4Zm-1 2V5v14Z" />
                </svg>
            </button>

            <div className="relative group">
                <button type="button" className={`p-2 rounded ${editor.isActive('fontSize') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Tamanho da fonte">
                    A<span className="text-xs ml-1">↕</span>
                </button>
                <div className="absolute z-10 hidden group-hover:flex flex-col w-32 p-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg">
                    {['12px', '14px', '16px', '18px', '24px', '32px'].map((size) => (
                        <button key={size} onClick={() => setFontSize(size)} className="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            {size}
                        </button>
                    ))}
                    <button onClick={resetFontSize} className="px-2 py-1 mt-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                        Padrão
                    </button>
                </div>
            </div>

            <div className="relative group">
                <button type="button" className={`p-2 rounded ${editor.isActive('textStyle') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Cor do texto">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Zm-4-6h8v-1h-2v-5h2V7H8v1h2v5H8v1Z" />
                    </svg>
                </button>

                <div className="absolute z-10 hidden group-hover:flex flex-wrap w-48 p-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg">
                    {colors.map((color) => {
                        const [light, dark] = color.sample.split(',')

                        return (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => setColor(color.value)}
                                className="w-6 h-6 m-1 rounded-full border border-gray-300 p-0 flex overflow-hidden"
                                title={color.name}
                            >
                                <span
                                    className="w-1/2 h-full"
                                    style={{ backgroundColor: light.trim() }}
                                />
                                <span
                                    className="w-1/2 h-full"
                                    style={{ backgroundColor: dark.trim() }}
                                />
                            </button>
                        )
                    })}
                    <button type="button" onClick={removeColor} className="w-full mt-2 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded">
                        Remover cor
                    </button>
                </div>
            </div>

            <div className="relative group">
                <button type="button" className={`p-2 rounded ${editor.isActive('highlight') ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Cor de fundo">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M15 17h5v-2h-5v2zM4 5v14l7-7 7 7V5L11 12L4 5z" />
                    </svg>
                </button>

                <div className="absolute z-10 hidden group-hover:flex flex-wrap w-48 p-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg">
                    {HighlightColors.map((color) => {
                        const [light, dark] = color.sample.split(',')

                        return (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => setHighlight(color.value)}
                                className="w-6 h-6 m-1 rounded-full border border-gray-300 p-0 flex overflow-hidden"
                                title={color.name}
                            >
                                <span
                                    className="w-1/2 h-full"
                                    style={{ backgroundColor: light.trim() }}
                                />
                                <span
                                    className="w-1/2 h-full"
                                    style={{ backgroundColor: dark.trim() }}
                                />
                            </button>
                        )
                    })}
                    <button type="button" onClick={removeHighlight} className="w-full mt-2 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded">
                        Remover fundo
                    </button>
                </div>
            </div>
        </div>
    )
}
