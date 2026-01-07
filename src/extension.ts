import * as vscode from 'vscode';

let currentCode = 'Select code and run the command';

export function activate(context: vscode.ExtensionContext) {
    const treeProvider = new CodeTreeProvider();

    vscode.window.registerTreeDataProvider('codeTree', treeProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('experiment.showSelectedCode', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            currentCode =
                editor.document.getText(editor.selection) || 'No code selected';

            treeProvider.refresh();
        })
    );
}

class CodeTreeProvider implements vscode.TreeDataProvider<string> {
    private _onDidChangeTreeData =
        new vscode.EventEmitter<string | undefined>();

    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: string): vscode.TreeItem {
        return new vscode.TreeItem(
            element,
            vscode.TreeItemCollapsibleState.None
        );
    }

    getChildren(): string[] {
        return [currentCode];
    }
}
