import React, { useEffect } from "react";

const LoadScripts = () => {
  useEffect(() => {
    const scripts = [
      { src: "/assets/js/vendors/jquery/jquery.min.js" },
      { src: "/assets/js/vendors/bootstrap/dist/js/bootstrap.bundle.min.js", defer: true },
      { src: "/assets/js/vendors/bootstrap/dist/js/popper.min.js", defer: true },
      { src: "/assets/js/vendors/font-awesome/fontawesome-min.js" },
      { src: "/assets/js/password.js" },
      { src: "/assets/js/script.js" },
    ];

    scripts.forEach(({ src, defer }) => {
      const script = document.createElement("script");
      script.src = src;
      if (defer) script.defer = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    });
  }, []);

  return null; // Компонент не рендерит ничего
};

export default LoadScripts;
