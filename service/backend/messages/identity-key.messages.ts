export const IdentityKeyMessages = {
  CREATE_SUCCESS: "App key added. Names will resolve on the next load.",
  LIST_SUCCESS: "App keys fetched successfully",
  REMOVE_SUCCESS: "App key removed",
  UPDATE_SUCCESS: "App key updated. Names will resolve on the next load.",
  NOT_FOUND: "App key not found",
  NOT_CONFIGURED:
    "App keys are not configured on this server. Set the CONNECTOR_ENC_KEY secret.",
  UNSUPPORTED_PROVIDER: "That identity provider is not supported yet.",
  VALIDATION_ERROR: "Provide a label and a secret key.",
  INVALID_KEY:
    "Clerk rejected this secret key. Check that you pasted the full sk key for the right instance.",
  DUPLICATE: "This secret key is already added.",
};
