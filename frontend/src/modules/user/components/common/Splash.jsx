import logo from '../../../../assets/loginPage/Logo.png';

const Splash = () => {
  return (
    <div className="absolute inset-0 bg-black z-[9999] flex justify-center items-center animate-splash-fade">
      <div className="flex flex-col items-center animate-zoom-in">
          <div className="w-24 h-24 mb-4">
             <img src={logo} alt="Jhumroo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white text-[32px] font-extrabold tracking-tighter">Jhumroo</h1>
      </div>
    </div>
  );
};

export default Splash;
