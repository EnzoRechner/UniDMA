/**
 * Type for the functions that the root component will provide to the service.
 * These functions directly control the global state of the ErrorModal.
 */
interface ErrorModalControls {
  show: (title: string, message: string) => void;
  hide: () => void;
}

// A private variable to hold the control functions provided by the root component.
let controls: ErrorModalControls | null = null;

/**
 * Initializes the modal service. This function MUST be called once
 * in the top-level component (e.g., _layout.tsx) to provide the state setters.
 * * @param modalControls - Functions to show and hide the error modal.
 */
export const initializeModalService = (modalControls: ErrorModalControls) => {
  controls = modalControls;
};

/**
 * The public interface for showing and hiding the error modal.
 * Components across the app will import and use this object:
 * e.g., modalService.showError('Something went wrong.');
 */
export const modalService = {
  /**
   * Shows the error modal with a specific message and optional title.
   * * @param message - The error message to display.
   * @param title - The optional title of the modal.
   */
  showError: (title: string, message: string) => {
    if (!controls) {
      console.log('ModalService not initialized. Call initializeModalService() in the root component.');
      // Provide a basic fallback if the service was not set up correctly
      alert(`Error: ${title || 'Operation Failed'}\n${message}`);
      return;
    }
    // Call the 'show' function provided by the root component
    controls.show(message, title);
  },
  
  /**
   * Hides the error modal.
   */
  hideError: () => {
    if (controls) {
      // Call the 'hide' function provided by the root component
      controls.hide();
    }
  },
};

export default {};
