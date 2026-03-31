const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((webVitals: any) => {
      const { getCLS, getFCP, getFID, getLCP, getTTFB } = webVitals;
      getCLS && getCLS(onPerfEntry);
      getFCP && getFCP(onPerfEntry);
      getFID && getFID(onPerfEntry);
      getLCP && getLCP(onPerfEntry);
      getTTFB && getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
