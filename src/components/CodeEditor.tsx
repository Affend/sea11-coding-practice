'use client'

import React, { useEffect, useRef } from 'react'
import Editor, { Monaco } from '@monaco-editor/react'
import { useCodeEditorStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface CodeEditorProps {
  className?: string
  onCodeChange?: (code: string) => void
  readOnly?: boolean
  height?: string
}

const defaultCCode = `// Selamat datang di SEA Coding Platform!
// Tulis kode C di sini dan klik "Jalankan"

#include <stdio.h>

int main() {
    printf("SEA Laboratory\\n");
    printf("Algoritma & Pemrograman C\\n");
    printf("Struktur Data Arduino UNO\\n");
    
    // Contoh: Mencetak deret Fibonacci
    int n = 10, t1 = 0, t2 = 1, nextTerm;
    
    printf("Deret Fibonacci (%d suku):\\n", n);
    for (int i = 1; i <= n; ++i) {
        printf("%d ", t1);
        nextTerm = t1 + t2;
        t1 = t2;
        t2 = nextTerm;
    }
    printf("\\n");
    
    return 0;
}`

const defaultArduinoCode = `// SEA Arduino Simulator
// Kode C++ untuk Arduino UNO

#include <Arduino.h>

// Pin LED built-in
const int LED_PIN = 13;

// Variabel untuk struktur data
struct Node {
    int data;
    Node* next;
};

Node* head = nullptr;

// Fungsi tambah node ke linked list
void push(int value) {
    Node* newNode = new Node();
    newNode->data = value;
    newNode->next = head;
    head = newNode;
}

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
    
    // Demo: Linked List
    push(10);
    push(20);
    push(30);
    
    Serial.println("Linked List dibuat:");
    Node* current = head;
    while (current != nullptr) {
        Serial.print(current->data);
        Serial.print(" -> ");
        current = current->next;
    }
    Serial.println("NULL");
}

void loop() {
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
    delay(500);
}`

export function CodeEditor({ className, onCodeChange, readOnly = false, height = '400px' }: CodeEditorProps) {
  const { code, language, theme, fontSize, setCode, setLanguage } = useCodeEditorStore()
  const editorRef = useRef<Monaco | null>(null)
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editorRef.current && onCodeChange) {
      const model = editorRef.current.getModel()
      if (model) {
        onCodeChange(model.getValue())
      }
    }
  }, [code, onCodeChange])

  const handleEditorDidMount = (editor: Monaco, monaco: any) => {
    editorRef.current = editor
    
    // Set default code based on language
    if (!code) {
      const defaultCode = language === 'c' ? defaultCCode : defaultArduinoCode
      editor.setValue(defaultCode)
      setCode(defaultCode)
    }

    // Add custom completion for C/C++
    monaco.languages.registerCompletionItemProvider('c', {
      provideCompletionItems: () => ({
        suggestions: [
          { label: 'printf', kind: monaco.languages.CompletionItemKind.Function, insertText: 'printf("${1}");', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'scanf', kind: monaco.languages.CompletionItemKind.Function, insertText: 'scanf("${1}", &${2});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'while', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'while (${1:condition}) {\n\t${0}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if (${1:condition}) {\n\t${0}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'switch', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t${0}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
        ],
      })
    })

    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: () => ({
        suggestions: [
          { label: 'Serial.begin', kind: monaco.languages.CompletionItemKind.Function, insertText: 'Serial.begin(${1:9600});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'Serial.print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'Serial.print(${1:value});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'Serial.println', kind: monaco.languages.CompletionItemKind.Function, insertText: 'Serial.println(${1:value});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'pinMode', kind: monaco.languages.CompletionItemKind.Function, insertText: 'pinMode(${1:pin}, ${2:MODE});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'digitalWrite', kind: monaco.languages.CompletionItemKind.Function, insertText: 'digitalWrite(${1:pin}, ${2:HIGH|LOW});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'digitalRead', kind: monaco.languages.CompletionItemKind.Function, insertText: 'digitalRead(${1:pin})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'delay', kind: monaco.languages.CompletionItemKind.Function, insertText: 'delay(${1:ms});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
          { label: 'struct', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'struct ${1:Name} {\n\t${2:type} ${3:member};\n};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
        ],
      })
    })
  }

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      onCodeChange?.(value)
    }
  }

  if (!mounted) {
    return (
      <div className={cn('bg-gray-900 rounded-lg', className)} style={{ height, minHeight: height }}>
        <div className="flex items-center justify-center h-full text-gray-500">
          Memuat editor...
        </div>
      </div>
    )
  }

  return (
    <Editor
      height={height}
      language={language}
      theme={theme}
      value={code}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      options={{
        fontSize,
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: true,
        formatOnType: true,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        folding: true,
        matchBrackets: 'always',
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        glyphMargin: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        readOnly,
      }}
      className={cn('rounded-lg', className)}
    />
  )
}

export function LanguageSelector() {
  const { language, setLanguage } = useCodeEditorStore()

  return (
    <div className="flex items-center gap-2">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'c' | 'cpp')}
        className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] appearance-none"
      >
        <option value="c">C (Algoritma & Pemrograman)</option>
        <option value="cpp">C++ (Arduino UNO)</option>
      </select>
    </div>
  )
}

export function ThemeSelector() {
  const { theme, setTheme, fontSize, setFontSize } = useCodeEditorStore()

  return (
    <div className="flex items-center gap-3">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'vs-dark' | 'vs-light' | 'hc-black')}
        className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] appearance-none"
      >
        <option value="vs-dark">Dark</option>
        <option value="vs-light">Light</option>
        <option value="hc-black">High Contrast</option>
      </select>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Ukuran:</span>
        <input
          type="range"
          min="10"
          max="24"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-24 h-1 bg-gray-700/60 rounded-lg appearance-none cursor-pointer accent-[#0066CC]"
        />
        <span className="w-6 text-right">{fontSize}px</span>
      </div>
    </div>
  )
}