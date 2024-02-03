import { NodeError } from "./error";

export enum OptionNodeType {
    Before,
    After,
};

export class OptionNodeData {
    readonly id: string;
    readonly type: OptionNodeType;
    readonly choice: string = "";
    readonly setChoice: (choice: string) => void;
    readonly error: NodeError;
    readonly setError: (error: NodeError) => void;

    constructor(id: string, type: OptionNodeType, choice: string, setChoice: (choice: string) => void,
        error: NodeError, setError: (error: NodeError) => void) {
        this.id = id;
        this.type = type;
        this.choice = choice;
        this.setChoice = setChoice;
        this.error = error;
        this.setError = setError;
    }
}
