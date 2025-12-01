// components/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { useCallback, forwardRef, useImperativeHandle } from 'react';

// Core Extensions 
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph'; 
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import History from '@tiptap/extension-history'; 
import Link from '@tiptap/extension-link';

// Structural Nodes
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item'; 
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';

// Styling
import { TextStyle } from '@tiptap/extension-text-style'; 
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';

// Icons
import { 
    Bold as BoldIcon, 
    Italic as ItalicIcon, 
    Underline as UnderlineIcon,
    Heading1, 
    Heading2, 
    List, 
    ListOrdered, 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    Highlighter, 
    Link as LinkIcon, 
    Undo, 
    Redo,
    Type
} from 'lucide-react';

// ----------------------------------------------------------------------
// 🛠️ CUSTOM FONT SIZE EXTENSION
// ----------------------------------------------------------------------
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ----------------------------------------------------------------------
// Toolbar Component
// ----------------------------------------------------------------------
const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title
}: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`p-2 rounded-md transition-colors duration-200 flex items-center justify-center ${
            isActive 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300' 
                : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
    >
        {children}
    </button>
);

const Toolbar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 items-center">
            
            {/* History */}
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 dark:border-gray-600 pr-2">
                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></ToolbarButton>
            </div>

            {/* Formatting */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold"><BoldIcon className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic"><ItalicIcon className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline"><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Highlight"><Highlighter className="w-4 h-4" /></ToolbarButton>
            
            {/* Font Size Select */}
            <div className="relative mx-1 group">
                <Type className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                <select
                    onChange={(e) => {
                        const size = e.target.value;
                        if (size) editor.chain().focus().setFontSize(size).run();
                        else editor.chain().focus().unsetFontSize().run();
                    }}
                    value={editor.getAttributes('textStyle').fontSize || ''}
                    className="pl-6 pr-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200 h-8"
                >
                    <option value="">Auto</option>
                    {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
            </div>

            {/* Color Picker */}
            <div className="relative mx-1 flex items-center">
                <input 
                    type="color" 
                    onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} 
                    value={editor.getAttributes('textStyle').color || '#000000'} 
                    className="h-6 w-6 cursor-pointer border-none p-0 bg-transparent rounded overflow-hidden"
                    title="Text Color"
                />
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Headings */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 className="w-4 h-4" /></ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List"><List className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolbarButton>
            
            {/* Alignment */}
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left"><AlignLeft className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center"><AlignCenter className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right"><AlignRight className="w-4 h-4" /></ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            
            <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Insert Link"><LinkIcon className="w-4 h-4" /></ToolbarButton>
        </div>
    );
};

// ----------------------------------------------------------------------
// Main Editor Component
// ----------------------------------------------------------------------

export interface RichTextEditorRef {
    insertContent: (content: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, { content: string; onUpdate: (html: string) => void; }>(
    ({ content, onUpdate }, ref) => {
        const editor = useEditor({
            extensions: [
                Document, Paragraph, Text, HardBreak, Bold, Italic,
                Heading.configure({ levels: [1, 2], HTMLAttributes: { class: 'font-bold text-2xl my-4 text-gray-900 dark:text-gray-100' } }), 
                BulletList.configure({ HTMLAttributes: { class: 'list-disc ml-5 space-y-1' } }),
                OrderedList.configure({ HTMLAttributes: { class: 'list-decimal ml-5 space-y-1' } }),
                ListItem, Blockquote.configure({ HTMLAttributes: { class: 'border-l-4 border-indigo-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4' } }),
                TextStyle, Color, FontSize, Underline,
                Highlight.configure({ multicolor: true }), 
                Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 dark:text-blue-400 underline cursor-pointer' } }),
                History, 
                TextAlign.configure({ types: ['heading', 'paragraph'] }),
            ],
            content: content,
            onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
            immediatelyRender: false, 
            editorProps: {
                attributes: {
                    // Improved prose styling and dark mode support
                    class: 'prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none text-gray-800 dark:text-gray-200',
                },
            },
        });

        useImperativeHandle(ref, () => ({
            insertContent: (newContent: string) => {
                editor?.chain().focus().insertContent(newContent).run();
            }
        }));

        return (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm transition-colors duration-300">
                <Toolbar editor={editor} />
                <EditorContent editor={editor} />
            </div>
        );
    }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;