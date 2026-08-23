function toGeminiSchema(schema) {
  if (!schema) return undefined;
  if (Array.isArray(schema.type)) {
    const isNullable = schema.type.includes("null");
    const mainType = schema.type.find(t => t !== "null");
    const result = toGeminiSchema({ ...schema, type: mainType });
    if (isNullable) result.nullable = true;
    return result;
  }

  const result = {};
  if (schema.type) {
    result.type = schema.type.toUpperCase();
  }
  if (schema.properties) {
    result.properties = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      result.properties[k] = toGeminiSchema(v);
    }
  }
  if (schema.items) {
    result.items = toGeminiSchema(schema.items);
  }
  if (schema.enum) {
    result.enum = schema.enum.filter(e => e !== null);
  }
  if (schema.required) {
    result.required = schema.required;
  }
  if (schema.description) {
    result.description = schema.description;
  }
  return result;
}

const s = {
  type: "object",
  properties: {
    title: { type: ["string", "null"] },
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, category: { type: "string", enum: ["skill", "other"] } }
      }
    }
  }
};
console.log(JSON.stringify(toGeminiSchema(s), null, 2));
