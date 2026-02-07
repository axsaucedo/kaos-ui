import React from 'react';
import { getBezierPath, useInternalNode, EdgeLabelRenderer, Position, type EdgeProps } from '@xyflow/react';

const NODE_W = 240;
const NODE_H = 120;

type Side = 'top' | 'bottom' | 'left' | 'right';

function getAnchors(x: number, y: number) {
  return {
    top:    { x: x + NODE_W / 2, y },
    bottom: { x: x + NODE_W / 2, y: y + NODE_H },
    left:   { x, y: y + NODE_H / 2 },
    right:  { x: x + NODE_W, y: y + NODE_H / 2 },
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const SIDE_TO_POSITION: Record<Side, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

function bestAnchors(srcPos: { x: number; y: number }, tgtPos: { x: number; y: number }) {
  const srcAnchors = getAnchors(srcPos.x, srcPos.y);
  const tgtAnchors = getAnchors(tgtPos.x, tgtPos.y);
  const sides: Side[] = ['top', 'bottom', 'left', 'right'];

  let best = { src: srcAnchors.right, tgt: tgtAnchors.left, srcSide: 'right' as Side, tgtSide: 'left' as Side, d: Infinity };

  for (const ss of sides) {
    for (const ts of sides) {
      const d = dist(srcAnchors[ss], tgtAnchors[ts]);
      if (d < best.d) {
        best = { src: srcAnchors[ss], tgt: tgtAnchors[ts], srcSide: ss, tgtSide: ts, d };
      }
    }
  }
  return best;
}

export function DynamicEdge({
  id, source, target, label, style, markerEnd, animated,
  labelStyle, labelBgStyle,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const srcPos = sourceNode.internals.positionAbsolute;
  const tgtPos = targetNode.internals.positionAbsolute;
  const { src, tgt, srcSide, tgtSide } = bestAnchors(srcPos, tgtPos);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: src.x,
    sourceY: src.y,
    targetX: tgt.x,
    targetY: tgt.y,
    sourcePosition: SIDE_TO_POSITION[srcSide],
    targetPosition: SIDE_TO_POSITION[tgtSide],
  });

  const markerEndStr = typeof markerEnd === 'string'
    ? markerEnd
    : markerEnd && typeof markerEnd === 'object' && 'type' in markerEnd
      ? `url(#${(markerEnd as any).type})`
      : undefined;

  return (
    <>
      <path
        id={id}
        d={edgePath}
        style={style}
        className={`react-flow__edge-path ${animated ? 'react-flow__edge-path--animated' : ''}`}
        markerEnd={markerEndStr}
        fill="none"
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              ...(labelBgStyle as any),
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            <span style={labelStyle as any}>{label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
