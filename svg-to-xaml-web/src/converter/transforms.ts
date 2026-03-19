export function parseTransform(transformStr: string): DOMMatrix {
  if (!transformStr) return new DOMMatrix();

  // Use a temporary SVG element to parse the transform string
  // This handles all SVG transform functions correctly
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);
  g.setAttribute('transform', transformStr);

  let matrix: DOMMatrix;
  try {
    const ctm = g.getCTM();
    matrix = ctm ? new DOMMatrix([ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f]) : new DOMMatrix();
  } catch {
    matrix = new DOMMatrix();
  } finally {
    document.body.removeChild(svg);
  }

  return matrix;
}

export function applyMatrixToPoint(matrix: DOMMatrix, x: number, y: number): { x: number; y: number } {
  const pt = new DOMPoint(x, y).matrixTransform(matrix);
  return { x: pt.x, y: pt.y };
}

export function matrixToXamlString(m: DOMMatrix): string {
  return `${fmt(m.a)},${fmt(m.b)},${fmt(m.c)},${fmt(m.d)},${fmt(m.e)},${fmt(m.f)}`;
}

function fmt(n: number): string {
  return parseFloat(n.toFixed(6)).toString();
}

export function isIdentity(m: DOMMatrix): boolean {
  return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;
}

/**
 * Transform path data string by applying a matrix to all coordinates.
 * This is a best-effort approach for common SVG path commands.
 */
export function transformPathData(pathData: string, matrix: DOMMatrix): string {
  if (isIdentity(matrix)) return pathData;

  // Tokenize path data
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return pathData;

  const result: string[] = [];
  let cmd = '';
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[a-zA-Z]$/.test(token)) {
      cmd = token;
      result.push(cmd);
      i++;

      // Commands that take coordinate pairs
      if ('MmLlTt'.includes(cmd)) {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++] || '0');
          if (cmd === cmd.toUpperCase()) {
            const p = applyMatrixToPoint(matrix, x, y);
            result.push(`${fmt(p.x)},${fmt(p.y)}`);
          } else {
            // Relative: transform as vector (no translation)
            const p = applyMatrixToPoint(matrix, x, y);
            const o = applyMatrixToPoint(matrix, 0, 0);
            result.push(`${fmt(p.x - o.x)},${fmt(p.y - o.y)}`);
          }
        }
      } else if ('HhVv'.includes(cmd)) {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const val = parseFloat(tokens[i++]);
          if (cmd === 'H') {
            const p = applyMatrixToPoint(matrix, val, 0);
            // Convert to L command since H/V don't transform cleanly
            result[result.length - 1] = 'L';
            result.push(`${fmt(p.x)},${fmt(p.y)}`);
          } else if (cmd === 'V') {
            const p = applyMatrixToPoint(matrix, 0, val);
            result[result.length - 1] = 'L';
            result.push(`${fmt(p.x)},${fmt(p.y)}`);
          } else {
            result.push(fmt(val));
          }
        }
      } else if ('CcSs'.includes(cmd)) {
        const count = 'Cc'.includes(cmd) ? 6 : 4;
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          for (let j = 0; j < count; j += 2) {
            const x = parseFloat(tokens[i++] || '0');
            const y = parseFloat(tokens[i++] || '0');
            if (cmd === cmd.toUpperCase()) {
              const p = applyMatrixToPoint(matrix, x, y);
              result.push(`${fmt(p.x)},${fmt(p.y)}`);
            } else {
              const p = applyMatrixToPoint(matrix, x, y);
              const o = applyMatrixToPoint(matrix, 0, 0);
              result.push(`${fmt(p.x - o.x)},${fmt(p.y - o.y)}`);
            }
          }
        }
      } else if ('Qq'.includes(cmd)) {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          for (let j = 0; j < 4; j += 2) {
            const x = parseFloat(tokens[i++] || '0');
            const y = parseFloat(tokens[i++] || '0');
            if (cmd === cmd.toUpperCase()) {
              const p = applyMatrixToPoint(matrix, x, y);
              result.push(`${fmt(p.x)},${fmt(p.y)}`);
            } else {
              const p = applyMatrixToPoint(matrix, x, y);
              const o = applyMatrixToPoint(matrix, 0, 0);
              result.push(`${fmt(p.x - o.x)},${fmt(p.y - o.y)}`);
            }
          }
        }
      } else if ('Aa'.includes(cmd)) {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const rx = tokens[i++];
          const ry = tokens[i++];
          const rotation = tokens[i++];
          const largeArc = tokens[i++];
          const sweep = tokens[i++];
          const x = parseFloat(tokens[i++] || '0');
          const y = parseFloat(tokens[i++] || '0');
          result.push(rx, ry, rotation, largeArc, sweep);
          if (cmd === 'A') {
            const p = applyMatrixToPoint(matrix, x, y);
            result.push(`${fmt(p.x)},${fmt(p.y)}`);
          } else {
            const p = applyMatrixToPoint(matrix, x, y);
            const o = applyMatrixToPoint(matrix, 0, 0);
            result.push(`${fmt(p.x - o.x)},${fmt(p.y - o.y)}`);
          }
        }
      } else if ('Zz'.includes(cmd)) {
        // No parameters
      }
    } else {
      // Implicit repeat of last command
      result.push(token);
      i++;
    }
  }

  return result.join(' ');
}
