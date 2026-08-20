const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY;

  if (!apiKey) {
    const error = new Error("Google Maps Geocoding API key is not configured");
    error.statusCode = 500;
    throw error;
  }

  return apiKey;
};

const parseAddressComponents = (components = []) => {
  const getComponent = (types) => {
    const component = components.find((item) =>
      types.some((type) => item.types?.includes(type)),
    );

    return component?.long_name || "";
  };

  return {
    city: getComponent(["locality", "administrative_area_level_2"]),
    state: getComponent(["administrative_area_level_1"]),
    pincode: getComponent(["postal_code"]),
  };
};

export const geocodeAddress = async (address) => {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    address,
    key: apiKey,
  });

  const response = await fetch(`${GOOGLE_GEOCODING_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = new Error("Google Geocoding API request failed");
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.results?.length) {
    const error = new Error(
      data.status === "ZERO_RESULTS"
        ? "No location found for the provided address"
        : "Unable to geocode the provided address",
    );
    error.statusCode = 400;
    throw error;
  }

  const result = data.results[0];

  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    ...parseAddressComponents(result.address_components),
  };
};

export const reverseGeocodeCoordinates = async (latitude, longitude) => {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    key: apiKey,
  });

  const response = await fetch(`${GOOGLE_GEOCODING_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = new Error("Google Reverse Geocoding API request failed");
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.results?.length) {
  console.error("[GEOCODING] Google response:", {
    status: data.status,
    errorMessage: data.error_message || null,
  });

  const error = new Error(
    data.error_message || `Google Geocoding failed: ${data.status}`,
  );

  error.statusCode = 400;
  throw error;
}
  const result = data.results[0];

  return {
    latitude,
    longitude,
    address: result.formatted_address || "",
    ...parseAddressComponents(result.address_components),
  };
};