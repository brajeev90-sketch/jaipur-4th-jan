import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { useEffect } from 'react';
import { cn } from '../lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  List,
  ListOrdered,
} from 'lucide-react';

// Custom styles for the editor - ensure lists show bullets/numbers
const editorStyles = `
  .ProseMirror ul {
    list-style-type: disc !important;
    padding-left: 1.5rem !important;
    margin: 0.5rem 0 !important;
  }
  .ProseMirror ol {
    list-style-type: decimal !important;
    padding-left: 1.5rem !important;
    margin: 0.5rem 0 !important;
  }
  .ProseMirror li {
    margin: 0.25rem 0 !important;
  }
  .ProseMirror li p {
    margin: 0 !important;
  }
`;

const MenuButton = ({ onClick, isActive, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'p-1.5 rounded hover:bg-gray-200 transition-colors',
      isActive && 'bg-gray-200 text-amber-700'
    )}
  >
    {children}
  </button>
);

export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...', 
  className = '',
  minHeight = '100px',
  disabled = false,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc ml-4 pl-2',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal ml-4 pl-2',
        },
      }),
      ListItem,
      Underline,
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Only call onChange if value actually changed
      if (onChange && html !== value) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2',
      },
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-md bg-white overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1.5 border-b bg-gray-50">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="focus-within:ring-2 focus-within:ring-amber-500/20"
        style={{ minHeight }}
      />

      {/* Placeholder hint */}
      {!value && !editor.isFocused && (
        <div className="absolute top-[50px] left-3 text-gray-400 pointer-events-none text-sm">
          {placeholder}
        </div>
      )}
    </div>
  );
}
