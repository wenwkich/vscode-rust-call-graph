export const digraphStart = `
  digraph {
`;

export const funcDotStart = `
    node [ shape="plaintext" style="filled,rounded" color="#D5EDFF" ]
`;

export const varDotStart = `
    node [ color="#FCECCB" style="filled" ]
`;

export const digraphEnd = `
  }
`;

export const nodeWithId = (varName: string) =>
  `"${varName.replace(" ", "")}" [ id="${varName.replace(
    " ",
    ""
  )}" label="${varName}" ];`;
