import axios from "axios";

const API_BASE = "http://192.168.3.25:5000"; // troque pelo IP do servidor Flask

export const uploadFile = (formData) =>
  axios.post(`${API_BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const generateToken = (data) =>
  axios.post(`${API_BASE}/api/generate_token`, data);

export const listPrinters = () =>
  axios.get(`${API_BASE}/api/printers`);

export const enqueueFile = (data) =>
  axios.post(`${API_BASE}/api/enqueue`, data);
