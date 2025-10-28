/**
 * Type for the functions that the root component will provide to the service.
 * These functions directly control the global state of the ErrorModal.
 */
type ConfirmationCallback = () => void | Promise<void>;

/**
 * Controls interface for the modal state manager in the root component.
 * This is what the RootWrapper provides to the service.
 */
interface AppModalControls {
  // For simple error/alert display
  showError: (title: string, message: string) => void;
  // For simple success display
  showSuccess: (title: string, message: string) => void;

  // NEW: For confirmation dialogs
  showConfirm: (
    title: string, 
    message: string, 
    confirmCallback: ConfirmationCallback, 
    confirmText?: string,
    cancelText?: string
  ) => void;

  // To hide any currently visible modal
  hide: () => void;
}

// A private variable to hold the control functions provided by the root component.
let controls: AppModalControls | null = null;

/**
 * Initializes the modal service. This function MUST be called once
 * in the top-level component (e.g., _layout.tsx) to provide the state setters.
 * @param modalControls - Functions to show, confirm, and hide the modal.
 */
export const initializeModalService = (modalControls: AppModalControls) => {
  controls = modalControls;
};

/**
 * The public interface for showing alerts and confirmations across the app.
 */
export const modalService = {
  /**
   * Shows a simple error/alert modal.
   * @param title - The title of the modal.
   * @param message - The body message to display.
   */
  showError: (title: string, message: string) => {
    if (!controls) {
      console.log('ModalService not initialized. Call initializeModalService() in the root component.');
      // Fallback
      alert(`Error: ${title || 'Operation Failed'}\n${message}`);
      return;
    }
    // Correctly match the signature defined in the AppModalControls interface
    controls.showError(title, message);
  },


  /**
   * Shows a simple error/alert modal.
   * @param title - The title of the modal.
   * @param message - The body message to display.
   */
  showSuccess: (title: string, message: string) => {
    if (!controls) {
      console.log('ModalService not initialized. Call initializeModalService() in the root component.');
      // Fallback
      alert(`Success: ${title }\n${message}`);
      return;
    }
    // Correctly match the signature defined in the AppModalControls interface
    controls.showSuccess(title, message);
  },


  /**
   * Shows a confirmation modal with 'Yes' and 'No' buttons, executing a callback on 'Yes'.
   * @param title - The title of the confirmation modal.
   * @param message - The question/body message.
   * @param confirmCallback - The asynchronous function to execute upon confirmation.
   * @param confirmText - Text for the confirmation button (default 'Confirm').
   * @param cancelText - Text for the cancel button (default 'Cancel').
   */
  showConfirm: (
    title: string, 
    message: string, 
    confirmCallback: ConfirmationCallback, 
    confirmText: string = 'Confirm', 
    cancelText: string = 'Cancel'
  ) => {
    if (!controls) {
      console.log('ModalService not initialized. Fallback to native Alert.');
      alert(`${title}\n${message}`);
      return;
    }
    controls.showConfirm(title, message, confirmCallback, confirmText, cancelText);
  },
  
  /**
   * Hides any currently visible modal.
   */
  hide: () => {
    if (controls) {
      controls.hide();
    }
  },
};

export default {};
