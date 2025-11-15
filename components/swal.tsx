"use client";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export async function confirm(title = "Are you sure?", text = "", confirmText = "Yes", cancelText = "Cancel") {
  const res = await MySwal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
  });
  return !!res.isConfirmed;
}

export function successToast(title = "Done") {
  MySwal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
  });
}

export function errorAlert(title = "Error", text = "") {
  return MySwal.fire({
    title,
    text,
    icon: "error",
    confirmButtonText: "OK",
  });
}