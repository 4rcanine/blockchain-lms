// components/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { useCallback } from 'react';

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

// ----------------------------------------------------------------------
// 🛠️ CUSTOM FONT SIZE EXTENSION (Defines the missing command)
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
    return {
      types: ['textStyle'],
    };
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
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});
// ----------------------------------------------------------------------


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

    const baseClasses = "px-3 py-1 text-sm font-medium rounded hover:bg-gray-200 border border-gray-300";
    const activeClasses = "bg-blue-200 text-blue-700 border-blue-400";
    
    const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];

    return (
        <div className="flex flex-wrap gap-2 p-2 border rounded-t-md bg-gray-50">
            {/* Basic Formatting */}
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${baseClasses} ${editor.isActive('bold') ? activeClasses : 'text-gray-700'}`}>Bold</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${baseClasses} ${editor.isActive('italic') ? activeClasses : 'text-gray-700'}`}>Italic</button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${baseClasses} ${editor.isActive('underline') ? activeClasses : 'text-gray-700'}`}>Underline</button>
            
            {/* FONT SIZE DROPDOWN - Uses our new custom command */}
            <select
                onChange={(e) => {
                    const size = e.target.value;
                    if (size) {
                        editor.chain().focus().setFontSize(size).run();
                    } else {
                        editor.chain().focus().unsetFontSize().run();
                    }
                }}
                value={editor.getAttributes('textStyle').fontSize || ''}
                className={`${baseClasses} w-auto`}
            >
                <option value="">Size</option>
                {FONT_SIZES.map(size => (
                    <option key={size} value={size}>
                        {size}
                    </option>
                ))}
            </select>

            {/* Headings */}
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`${baseClasses} ${editor.isActive('heading', { level: 1 }) ? activeClasses : 'text-gray-700'}`}>H1</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${baseClasses} ${editor.isActive('heading', { level: 2 }) ? activeClasses : 'text-gray-700'}`}>H2</button>
            
            {/* Lists */}
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${baseClasses} ${editor.isActive('bulletList') ? activeClasses : 'text-gray-700'}`}>List</button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${baseClasses} ${editor.isActive('orderedList') ? activeClasses : 'text-gray-700'}`}>Numbered</button>
            
            {/* Alignment */}
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`${baseClasses} ${editor.isActive({ textAlign: 'left' }) ? activeClasses : 'text-gray-700'}`}>Left</button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`${baseClasses} ${editor.isActive({ textAlign: 'center' }) ? activeClasses : 'text-gray-700'}`}>Center</button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`${baseClasses} ${editor.isActive({ textAlign: 'right' }) ? activeClasses : 'text-gray-700'}`}>Right</button>
            
            <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={`${baseClasses} ${editor.isActive('highlight') ? activeClasses : 'text-gray-700'}`}>Highlight</button>
            <button type="button" onClick={setLink} className={`${baseClasses} ${editor.isActive('link') ? activeClasses : 'text-gray-700'}`}>Link</button>
            
            <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color} className="h-8 w-8 cursor-pointer rounded-full border-none p-0" />
            
            <button type="button" onClick={() => editor.chain().focus().undo().run()} className={baseClasses}>Undo</button>
            <button type="button" onClick={() => editor.chain().focus().redo().run()} className={baseClasses}>Redo</button>
        </div>
    );
};

// --- Main Editor Component ---
const RichTextEditor = ({ content, onUpdate }: { content: string; onUpdate: (html: string) => void; }) => {
    const editor = useEditor({
        extensions: [
            Document,
            Paragraph,
            Text,
            HardBreak,

            // 🎯 FORCE STYLING: HTMLAttributes ensures these classes are always applied
            Heading.configure({ 
                levels: [1, 2],
                HTMLAttributes: {
                    class: 'font-bold text-2xl my-4', // Forces H1/H2 styling
                },
            }), 
            BulletList.configure({
                HTMLAttributes: {
                    class: 'list-disc ml-5', // Forces Bullet visibility
                },
            }),
            OrderedList.configure({
                HTMLAttributes: {
                    class: 'list-decimal ml-5', // Forces Number visibility
                },
            }),
            ListItem,
            Blockquote,
            
            TextStyle, 
            Color,
            FontSize, // Our custom extension
            Underline,

            Highlight.configure({ multicolor: true }),
            Link.configure({ openOnClick: false }),
            History,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getHTML());
        },
        immediatelyRender: false, 
        editorProps: {
            attributes: {
                // We keep prose as a backup, but the HTMLAttributes above will force the layout
                class: 'prose lg:prose-xl max-w-none p-4 min-h-[200px] border rounded-b-md focus:outline-none',
            },
        },
    });

    return (
        <div>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;