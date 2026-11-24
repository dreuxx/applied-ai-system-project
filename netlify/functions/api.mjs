import api from "../../server/api.cjs";
export default (request) => api.handle(request);
export const config = { path: "/api/*" };
