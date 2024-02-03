import { OptionNodeData, OptionNodeType } from "./OptionNodeData";

interface NodeProps {
    id: string;
    type: OptionNodeType;
    selected: boolean;
    data: OptionNodeData;
}

const OptionNode = (p: NodeProps) => {
    // has to just choose A-F / J options
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = ["A", "B", "C", "D", "E", "F", "J"];
        if (options.includes(e.target.value)) {
            p.data.setChoice(e.target.value);
            return;
        }
    }

    return (
        <div>
            <h3>{
                p.type === OptionNodeType.Before ? "Before" : "After"
            }
            </h3>

            <select className="w-48 h-48 bg-rose-200 rounded-md" onChange={handleChange}>
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
                <option>E</option>
                <option>F</option>
                <option>J</option>
            </select>
        </div>
    );
}

export default OptionNode;
