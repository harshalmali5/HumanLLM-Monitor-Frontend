import ReactFlow, { Controls, Background, MiniMap, Panel } from "reactflow";

import { nanoid } from "nanoid";
import { shallow } from "zustand/shallow";
import useStore, { RFState } from "./store";
import { useCallback } from "react";
import AfterBeforeNode from "./nodes/AfterBeforeNode";
import { NodeType } from "./nodes/NodeData";
import InferenceNode from "./nodes/InferenceNode";

import "reactflow/dist/style.css";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  addNode: state.addNode,
});

const nodeTypes = {
  AfterBeforeNode,
  InferenceNode,
};

const nodeKeys = Object.keys(nodeTypes);

const randint = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function App() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore(
    selector,
    shallow
  );

  const nodePositions = useStore((state) => state.nodePositions, shallow);
  const addNode = useStore((state) => state.addNode, shallow);

  const getFreePosition = useCallback(() => {
    const currentPositions = Object.values(nodePositions()).sort((a, b) => {
      if (a.x !== b.x) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });
    const maxY = 500;
    const maxX = 1000;
    let pos = { x: 0, y: 0 };
    while (true) {
      pos = { x: randint(0, maxX + 1), y: randint(0, maxY + 1) };
      if (!currentPositions.find((p) => p.x === pos.x && p.y === pos.y)) {
        break;
      }
    }
    return pos;
  }, [nodePositions]);

  const genNode = useCallback(
    (isInference: boolean, type?: NodeType) => () => {
      const id = nanoid();
      const data = type;
      const position = getFreePosition();
      addNode({
        id,
        data,
        position,
        type: isInference ? nodeKeys[1] : nodeKeys[0],
      });
    },
    [addNode, getFreePosition]
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
      >
        <Background />
        <Controls position="bottom-left" className="flex justify-center" />
        <MiniMap />
        <Panel position="top-left" className="flex justify-center space-x-2">
          <button
            className="bg-rose-200 rounded px-2 py-1"
            onClick={genNode(false, NodeType.Before)}
          >
            Before Inference
          </button>
          <button
            className="bg-rose-200 rounded px-2 py-1"
            onClick={genNode(false, NodeType.After)}
          >
            After Inference
          </button>
          <button
            className="bg-rose-200 rounded px-2 py-1"
            onClick={genNode(true)}
          >
            Inference
          </button>
        </Panel>
      </ReactFlow>
    </>
  );
}

export default App;
