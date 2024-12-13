import "@/styles/globals.css";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./BlogDetailsCta.module.css";

const BlogDetailsCta = () => {
  return (
    <div className="container mx-auto w-full mt-12 sm:mb-12">
      <div className={classes.blogdetailsctacontainer}>
        <div className="items-center grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 mt-10 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 ">
          <div className="md:pl-20">
            <div>
              <h2 className="text-[#FFFFFF] tahoma lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">
                Buying Or Selling
              </h2>
            </div>
            <div>
              <Button buttonText="Find An Agent" />
            </div>
            <div>
              <h2 className="text-[#FFFFFF] tahoma lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">
                VA Loan Expert
              </h2>
            </div>
            <div>
              <Button buttonText="Find A Lender" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailsCta;
