import { TableKit } from '@tiptap/extension-table';

/** Tabellen mit ziehbaren Spaltenbreiten. */
export const tableExtensions = [TableKit.configure({ table: { resizable: true, cellMinWidth: 80 } })];
